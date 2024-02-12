package io.github.mucsi96.learnlanguage.model.anki;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Templates generated by hbm2java
 */
@Entity
@Table(name="templates"
    , uniqueConstraints = @UniqueConstraint(columnNames={"name", "ntid"}) 
)
public class Templates  implements java.io.Serializable {


     private TemplatesId id;
     private String name;
     private int mtimeSecs;
     private int usn;
     private String config;

    public Templates() {
    }

    public Templates(TemplatesId id, String name, int mtimeSecs, int usn, String config) {
       this.id = id;
       this.name = name;
       this.mtimeSecs = mtimeSecs;
       this.usn = usn;
       this.config = config;
    }
   
     @EmbeddedId

    
    @AttributeOverrides( {
        @AttributeOverride(name="ntid", column=@Column(name="ntid", nullable=false) ), 
        @AttributeOverride(name="ord", column=@Column(name="ord", nullable=false) ) } )
    public TemplatesId getId() {
        return this.id;
    }
    
    public void setId(TemplatesId id) {
        this.id = id;
    }

    
    @Column(name="name", nullable=false, length=2000000000)
    public String getName() {
        return this.name;
    }
    
    public void setName(String name) {
        this.name = name;
    }

    
    @Column(name="mtime_secs", nullable=false)
    public int getMtimeSecs() {
        return this.mtimeSecs;
    }
    
    public void setMtimeSecs(int mtimeSecs) {
        this.mtimeSecs = mtimeSecs;
    }

    
    @Column(name="usn", nullable=false)
    public int getUsn() {
        return this.usn;
    }
    
    public void setUsn(int usn) {
        this.usn = usn;
    }

    
    @Column(name="config", nullable=false, length=2000000000)
    public String getConfig() {
        return this.config;
    }
    
    public void setConfig(String config) {
        this.config = config;
    }




}


